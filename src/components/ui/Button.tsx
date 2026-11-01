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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4BD8]/40 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer font-sans';

  const variants = {
    primary: 'bg-[#111417] hover:bg-[#20252A] text-white border border-[#111417] shadow-xs font-medium',
    action: 'bg-[#1E4BD8] hover:bg-[#163CAE] text-white border border-[#1E4BD8] shadow-xs font-medium',
    secondary: 'bg-white hover:bg-[#F5F5F0] text-[#111417] border border-[#E2E4DC] hover:border-[#CDCFCE] shadow-xs font-medium',
    danger: 'bg-[#FDF2F1] hover:bg-[#FCE8E6] text-[#D03B2E] border border-[#F8D3D0] font-medium',
    outline: 'bg-transparent hover:bg-[#F0F1EA] text-[#111417] border border-[#E2E4DC] hover:border-[#CDCFCE] font-medium',
    ghost: 'bg-transparent hover:bg-[#F0F1EA] text-[#5E656D] hover:text-[#111417] border border-transparent'
  };

  const sizes = {
    xs: 'text-[11px] h-7 px-2.5 gap-1.5 font-mono rounded-md',
    sm: 'text-xs h-8 px-3 gap-1.5 font-medium rounded-lg',
    md: 'text-xs h-9 px-3.5 gap-2 font-medium rounded-lg',
    lg: 'text-sm h-10 px-4.5 gap-2.5 font-semibold rounded-lg'
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
