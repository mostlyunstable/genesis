import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E0A34A] disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-[#E0A34A] hover:bg-[#c98e3b] text-[#090B0F] font-semibold border border-[#E0A34A]',
    secondary: 'bg-[#171E28] hover:bg-[#1C2633] text-[#E8EDF4] border border-[#252D38]',
    danger: 'bg-[#EF5350]/20 hover:bg-[#EF5350]/30 text-[#EF5350] border border-[#EF5350]/40',
    outline: 'bg-transparent hover:bg-[#171E28] text-[#8994A4] hover:text-[#E8EDF4] border border-[#252D38]',
    ghost: 'bg-transparent hover:bg-[#171E28] text-[#8994A4] hover:text-[#E8EDF4]'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-4 py-2.5 gap-2.5'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
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
