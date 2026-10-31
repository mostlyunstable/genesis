import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3.5 text-[#64748B] pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#0F1523] border border-[#1E293B] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all ${
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
      className={`bg-[#0F1523] border border-[#1E293B] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all cursor-pointer ${className}`}
      {...props}
    >
      {options ? (
        options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0F1523] text-white">
            {opt.label}
          </option>
        ))
      ) : (
        children
      )}
    </select>
  );
};
