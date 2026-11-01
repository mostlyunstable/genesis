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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#91A78B] disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer font-sans';

  const variants = {
    primary: 'bg-[#54765C] hover:bg-[#436049] text-white border border-transparent shadow-sm font-semibold',
    action: 'bg-[#54765C] hover:bg-[#436049] text-white border border-transparent shadow-sm font-semibold',
    secondary: 'bg-white hover:bg-[#F0F1EB] text-[#20251F] border border-[#E3E5DC] shadow-sm font-medium',
    danger: 'bg-[#F9ECEB] hover:bg-[#F2D5D3] text-[#B94C43] border border-[#F2D5D3] font-semibold',
    outline: 'bg-transparent hover:bg-[#F0F1EB] text-[#20251F] border border-[#E3E5DC] font-medium',
    ghost: 'bg-transparent hover:bg-[#F0F1EB] text-[#73796F] hover:text-[#20251F] border border-transparent'
  };

  const sizes = {
    xs: 'text-[11px] px-3 py-1 gap-1.5 font-mono',
    sm: 'text-xs px-3.5 py-1.5 gap-2 font-medium',
    md: 'text-sm px-4 py-2 gap-2 font-medium',
    lg: 'text-sm px-5 py-2.5 gap-2.5 font-semibold'
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
