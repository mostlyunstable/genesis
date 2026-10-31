import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'action';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6] disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.99] cursor-pointer font-sans';

  const variants = {
    primary: 'bg-[#3B82F6] hover:bg-[#2563EB] text-white border border-[#60A5FA]/30 shadow-sm font-semibold',
    action: 'bg-[#F97316] hover:bg-[#EA580C] text-white border border-[#FB923C]/30 shadow-sm font-semibold',
    secondary: 'bg-[#10131B] hover:bg-[#161B26] text-slate-200 hover:text-white border border-[#1C2230] hover:border-[#2A3347] shadow-sm',
    danger: 'bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 font-semibold',
    outline: 'bg-transparent hover:bg-[#10131B] text-[#94A3B8] hover:text-white border border-[#1C2230]',
    ghost: 'bg-transparent hover:bg-[#10131B] text-[#94A3B8] hover:text-white border border-transparent'
  };

  const sizes = {
    xs: 'text-[11px] px-2 py-1 gap-1 font-mono',
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2 font-medium',
    lg: 'text-sm px-4 py-2.5 gap-2.5 font-semibold'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
