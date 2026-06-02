import React from 'react';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`text-xs font-black text-muted-foreground mr-1 select-none leading-none disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
        {...props}
      />
    );
  }
);
Label.displayName = 'Label';
