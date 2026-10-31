import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3 text-[#8994A4] pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#0D1016] border border-[#252D38] rounded px-3 py-1.5 text-xs text-[#E8EDF4] placeholder-[#586574] focus:outline-none focus:border-[#E0A34A] focus:ring-1 focus:ring-[#E0A34A] transition-colors ${
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
      className={`bg-[#0D1016] border border-[#252D38] rounded px-2.5 py-1.5 text-xs text-[#E8EDF4] focus:outline-none focus:border-[#E0A34A] focus:ring-1 focus:ring-[#E0A34A] transition-colors ${className}`}
      {...props}
    >
      {options ? (
        options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#121720] text-[#E8EDF4]">
            {opt.label}
          </option>
        ))
      ) : (
        children
      )}
    </select>
  );
};
