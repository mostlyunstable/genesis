import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3.5 text-[#969B91] pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2 text-xs text-[#20251F] placeholder-[#969B91] focus:outline-none focus:border-[#54765C] focus:ring-1 focus:ring-[#91A78B] transition-all ${
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
      className={`bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2 text-xs text-[#20251F] focus:outline-none focus:border-[#54765C] focus:ring-1 focus:ring-[#91A78B] transition-all cursor-pointer ${className}`}
      {...props}
    >
      {options ? (
        options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-[#20251F]">
            {opt.label}
          </option>
        ))
      ) : (
        children
      )}
    </select>
  );
};
