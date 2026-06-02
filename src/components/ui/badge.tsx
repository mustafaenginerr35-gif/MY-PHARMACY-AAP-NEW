import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export const Badge = ({ className = '', variant = 'default', ...props }: BadgeProps) => {
  let variantStyles = 'bg-primary text-primary-foreground hover:bg-primary/80';
  if (variant === 'secondary') variantStyles = 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
  else if (variant === 'destructive') variantStyles = 'bg-destructive text-destructive-foreground hover:bg-destructive/80';
  else if (variant === 'outline') variantStyles = 'text-foreground border border-border bg-transparent';

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantStyles} ${className}`}
      {...props}
    />
  );
};
