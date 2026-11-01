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
    brand: 'bg-[#EFF4FF] text-[#1E4BD8] border-[#D0DEFF]',
    accent: 'bg-[#EFF4FF] text-[#1E4BD8] border-[#D0DEFF]',
    critical: 'bg-[#FDF2F1] text-[#D03B2E] border-[#F8D3D0]',
    high: 'bg-[#FDF7ED] text-[#C27814] border-[#F7E1C0]',
    warning: 'bg-[#FAF5EB] text-[#B28A42] border-[#F4ECD5]',
    medium: 'bg-[#FAF5EB] text-[#B28A42] border-[#F4ECD5]',
    info: 'bg-[#F0F4F8] text-[#486581] border-[#D9E2EC]',
    low: 'bg-[#F0F4F8] text-[#486581] border-[#D9E2EC]',
    success: 'bg-[#EDF7F1] text-[#1E824C] border-[#C6E8D5]',
    resolved: 'bg-[#EDF7F1] text-[#1E824C] border-[#C6E8D5]',
    neutral: 'bg-[#F0F1EA] text-[#5E656D] border-[#E2E4DC]'
  };

  const dotColors: Record<string, string> = {
    brand: 'bg-[#1E4BD8]',
    accent: 'bg-[#1E4BD8]',
    critical: 'bg-[#D03B2E]',
    high: 'bg-[#C27814]',
    warning: 'bg-[#B28A42]',
    medium: 'bg-[#B28A42]',
    info: 'bg-[#486581]',
    low: 'bg-[#486581]',
    success: 'bg-[#1E824C]',
    resolved: 'bg-[#1E824C]',
    neutral: 'bg-[#8A939E]'
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
