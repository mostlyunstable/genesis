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
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-tight rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4BD8]/50 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer font-sans whitespace-nowrap';

  const variants = {
    primary: 'bg-[#111417] hover:bg-[#1E2328] text-white border-2 border-[#2A3138] hover:border-[#404A54] shadow-xs font-bold',
    action: 'bg-[#1E4BD8] hover:bg-[#163CAE] text-white border-2 border-[#4D76F8] hover:border-[#6B8EF9] shadow-xs font-bold',
    secondary: 'bg-white hover:bg-[#F0F1EA] text-[#111417] border-2 border-[#CFD4C9] hover:border-[#111417] shadow-2xs font-bold',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white border-2 border-rose-700 hover:border-rose-800 shadow-xs font-bold',
    outline: 'bg-transparent hover:bg-[#F0F1EA] text-[#111417] border-2 border-[#CFD4C9] hover:border-[#111417] font-bold',
    ghost: 'bg-transparent hover:bg-[#F0F1EA] text-[#5C645B] hover:text-[#111417] border-2 border-transparent hover:border-[#E2E4DC] font-bold'
  };

  const sizes = {
    xs: 'text-[11px] h-7.5 px-3 gap-1.5 rounded-md font-bold',
    sm: 'text-xs h-8.5 px-4 gap-2 rounded-lg font-bold',
    md: 'text-xs sm:text-sm h-10 px-5 gap-2.5 rounded-lg font-bold',
    lg: 'text-sm sm:text-base h-11.5 px-6 gap-3 rounded-xl font-bold'
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
