import React from 'react';
import { Severity, Outcome } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'accent' | 'critical' | 'high' | 'warning' | 'medium' | 'info' | 'low' | 'success' | 'resolved' | 'neutral';
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
  const variantStyles: Record<string, string> = {
    brand: 'bg-[#EAF0E6] text-[#54765C] border-[#CFDCC9]',
    accent: 'bg-[#EAF0E6] text-[#54765C] border-[#CFDCC9]',
    critical: 'bg-[#F9ECEB] text-[#B94C43] border-[#F2D5D3]',
    high: 'bg-[#FAF2EC] text-[#C47A45] border-[#F4E2D5]',
    warning: 'bg-[#FAF5EB] text-[#B28A42] border-[#F4ECD5]',
    medium: 'bg-[#FAF5EB] text-[#B28A42] border-[#F4ECD5]',
    info: 'bg-[#EDF3F1] text-[#547D70] border-[#DCE8E5]',
    low: 'bg-[#EDF3F1] text-[#547D70] border-[#DCE8E5]',
    success: 'bg-[#EDF3EF] text-[#64856C] border-[#DBE7DF]',
    resolved: 'bg-[#EDF3EF] text-[#64856C] border-[#DBE7DF]',
    neutral: 'bg-[#F0F1EB] text-[#73796F] border-[#E3E5DC]'
  };

  const dotColors: Record<string, string> = {
    brand: 'bg-[#54765C]',
    accent: 'bg-[#54765C]',
    critical: 'bg-[#B94C43]',
    high: 'bg-[#C47A45]',
    warning: 'bg-[#B28A42]',
    medium: 'bg-[#B28A42]',
    info: 'bg-[#547D70]',
    low: 'bg-[#547D70]',
    success: 'bg-[#64856C]',
    resolved: 'bg-[#64856C]',
    neutral: 'bg-[#969B91]'
  };

  const resolvedStyle = variantStyles[variant] || variantStyles.neutral;
  const resolvedDot = dotColors[variant] || dotColors.neutral;

  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5 font-medium',
    sm: 'text-[11px] px-2.5 py-0.5 font-medium',
    md: 'text-xs px-3 py-1 font-medium'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wider font-mono uppercase ${resolvedStyle} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${resolvedDot}`} />}
      {children}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: Severity; className?: string }> = ({
  severity,
  className = ''
}) => {
  const map: Record<Severity, 'critical' | 'high' | 'warning' | 'low'> = {
    critical: 'critical',
    warning: 'high',
    info: 'warning',
    low: 'low'
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
