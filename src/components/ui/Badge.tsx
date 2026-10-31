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
    brand: 'bg-[#FFF0E8] text-[#F15A24] border-[#F15A24]/20',
    critical: 'bg-[#FDF2F2] text-[#D94B45] border-[#D94B45]/20',
    warning: 'bg-[#FFFBEB] text-[#D97706] border-[#D97706]/20',
    info: 'bg-[#F0F6FF] text-[#4F7FC1] border-[#4F7FC1]/20',
    success: 'bg-[#F0FDF4] text-[#258A62] border-[#258A62]/20',
    neutral: 'bg-[#F3F2EE] text-[#77736D] border-[#E9E6E0]'
  };

  const dotColors = {
    brand: 'bg-[#F15A24]',
    critical: 'bg-[#D94B45]',
    warning: 'bg-[#D97706]',
    info: 'bg-[#4F7FC1]',
    success: 'bg-[#258A62]',
    neutral: 'bg-[#77736D]'
  };

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.2 font-medium',
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide font-mono ${variantStyles[normalizedVariant]} ${sizeStyles[size]} ${className}`}
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
