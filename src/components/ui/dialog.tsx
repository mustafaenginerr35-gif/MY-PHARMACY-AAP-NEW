import React from 'react';

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Dialog = ({ children, open, onOpenChange }: DialogProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>
  );
};

export const DialogTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const DialogContent = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`relative z-50 grid w-full max-w-lg gap-4 border border-border bg-card p-6 shadow-xl rounded-3xl animate-in fade-in-50 zoom-in-95 ${className}`} {...props}>
     {children}
  </div>
);

export const DialogHeader = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 text-right ${className}`} {...props} />
);

export const DialogFooter = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end gap-2 ${className}`} {...props} />
);

export const DialogTitle = ({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={`text-lg font-black leading-none tracking-tight text-foreground ${className}`} {...props} />
);

export const DialogDescription = ({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props} />
);
