import React, { createContext, useContext } from 'react';

const TabsContext = createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

export const Tabs = ({ children, value, onValueChange, className = '' }: { children: React.ReactNode; value?: string; onValueChange?: (value: string) => void; className?: string }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={`w-full ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`inline-flex items-center justify-center p-1 bg-muted rounded-xl text-muted-foreground select-none ${className}`}>
      {children}
    </div>
  );
};

export const TabsTrigger = ({ children, value, className = '' }: { children: React.ReactNode; value: string; className?: string }) => {
  const { value: selectedValue, onValueChange } = useContext(TabsContext);
  const isActive = selectedValue === value;
  
  return (
    <button
      onClick={() => onValueChange?.(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2.5 text-sm font-black transition-all hover:text-foreground cursor-pointer ${
        isActive 
          ? 'bg-card text-foreground shadow-sm' 
          : 'text-muted-foreground bg-transparent'
      } ${className}`}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ children, value, className = '' }: { children: React.ReactNode; value: string; className?: string }) => {
  const { value: selectedValue } = useContext(TabsContext);
  if (selectedValue !== value) return null;
  
  return (
    <div className={`mt-2 focus-visible:outline-none ${className}`}>
      {children}
    </div>
  );
};
