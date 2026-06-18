import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    let baseStyles = 'inline-flex items-center justify-center rounded-xl font-bold transition-all duration-300 ease-out focus:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96] cursor-pointer hover:scale-[1.02]';
    
    let variantStyles = '';
    if (variant === 'default') variantStyles = 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20';
    else if (variant === 'destructive') variantStyles = 'bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/10 hover:shadow-lg hover:shadow-rose-500/20';
    else if (variant === 'outline') variantStyles = 'border border-border bg-card/60 backdrop-blur-sm text-foreground hover:bg-muted/80 hover:border-primary/50';
    else if (variant === 'secondary') variantStyles = 'bg-secondary/80 backdrop-blur-sm text-secondary-foreground hover:bg-secondary';
    else if (variant === 'ghost') variantStyles = 'hover:bg-muted/60 hover:text-foreground text-muted-foreground';
    else if (variant === 'link') variantStyles = 'text-primary underline-offset-4 hover:underline bg-transparent';

    let sizeStyles = '';
    if (size === 'default') sizeStyles = 'h-11 px-5 text-sm';
    else if (size === 'sm') sizeStyles = 'h-9 px-3 text-xs rounded-lg';
    else if (size === 'lg') sizeStyles = 'h-12 px-8 text-base';
    else if (size === 'icon') sizeStyles = 'h-11 w-11 rounded-xl';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
