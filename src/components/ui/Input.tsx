import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3.5 text-[#77736D] pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-white border border-[#E9E6E0] rounded-lg px-3.5 py-2 text-xs text-[#171717] placeholder-[#A5A19A] focus:outline-none focus:border-[#F15A24] focus:ring-1 focus:ring-[#F15A24] transition-all ${
            icon ? 'pl-9' : ''
          } ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  className = '',
  children,
  options,
  ...props
}) => {
  return (
    <select
      className={`bg-white border border-[#E9E6E0] rounded-lg px-3 py-1.5 text-xs text-[#171717] focus:outline-none focus:border-[#F15A24] focus:ring-1 focus:ring-[#F15A24] transition-all cursor-pointer ${className}`}
      {...props}
    >
      {options ? (
        options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-[#171717]">
            {opt.label}
          </option>
        ))
      ) : (
        children
      )}
    </select>
  );
};
