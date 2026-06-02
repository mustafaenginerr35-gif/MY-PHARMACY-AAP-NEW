import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={`flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
