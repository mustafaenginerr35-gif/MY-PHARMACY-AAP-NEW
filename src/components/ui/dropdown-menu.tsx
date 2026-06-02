import React, { useState, createContext, useContext, useRef, useEffect } from 'react';

const DropdownContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-right">{children}</div>
    </DropdownContext.Provider>
  );
};

export const DropdownMenuTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
  const { open, setOpen } = useContext(DropdownContext);
  return (
    <div onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="cursor-pointer">
       {children}
    </div>
  );
};

export const DropdownMenuContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { open, setOpen } = useContext(DropdownContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const clickOutside = () => setOpen(false);
    window.addEventListener('click', clickOutside);
    return () => window.removeEventListener('click', clickOutside);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div 
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className={`absolute left-0 mt-2 w-56 origin-top-left rounded-2xl border border-border bg-card p-2 shadow-lg z-50 animate-in fade-in-50 zoom-in-95 ${className}`}
    >
       {children}
    </div>
  );
};

export const DropdownMenuItem = ({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) => {
  const { setOpen } = useContext(DropdownContext);
  return (
    <button
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      className={`w-full flex items-center gap-2 select-none rounded-xl px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer text-right ${className}`}
    >
      {children}
    </button>
  );
};

export const DropdownMenuLabel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-3 py-1.5 text-xs font-black text-muted-foreground/80 ${className}`}>{children}</div>
);

export const DropdownMenuSeparator = () => (
  <div className="h-px bg-border my-1" />
);

export const DropdownMenuGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const DropdownMenuTriggerChild = ({ children }: { children: React.ReactNode }) => <>{children}</>;
