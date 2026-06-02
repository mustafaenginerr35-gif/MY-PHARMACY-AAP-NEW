import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    let baseStyles = 'inline-flex items-center justify-center rounded-xl font-bold transition-all focus:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer';
    
    let variantStyles = '';
    if (variant === 'default') variantStyles = 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm';
    else if (variant === 'destructive') variantStyles = 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm';
    else if (variant === 'outline') variantStyles = 'border border-border bg-transparent hover:bg-muted text-foreground';
    else if (variant === 'secondary') variantStyles = 'bg-muted text-muted-foreground hover:bg-muted/80';
    else if (variant === 'ghost') variantStyles = 'hover:bg-muted hover:text-foreground text-muted-foreground';
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
