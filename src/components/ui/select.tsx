import React from 'react';

interface SelectProps {
  children?: React.ReactNode;
  value?: any;
  onValueChange?: (value: any) => void;
  required?: boolean;
}

export const Select = ({ children, value, onValueChange, required }: SelectProps) => {
  const items: { value: string; label: string }[] = [];
  
  const extractItems = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!child || !React.isValidElement(child)) return;
      if (child.type === SelectItem) {
        items.push({
          value: (child.props as any).value,
          label: (child.props as any).children
        });
      } else if ((child.props as any).children) {
        extractItems((child.props as any).children);
      }
    });
  };
  
  extractItems(children);

  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        required={required}
        className="w-full h-11 text-right pr-4 pl-10 bg-card border border-border text-foreground font-bold text-sm rounded-xl focus:outline-none focus:border-primary appearance-none cursor-pointer"
      >
        {items.map((item) => (
          <option key={item.value} value={item.value} className="bg-card text-foreground font-semibold">
            {item.label}
          </option>
        ))}
      </select>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-[10px]">
         ▼
      </div>
    </div>
  );
};

export const SelectTrigger = ({ children, className = '', ...props }: { children?: React.ReactNode; className?: string; [key: string]: any }) => {
  return null;
};

export const SelectValue = ({ placeholder, ...props }: { placeholder?: string; [key: string]: any }) => {
  return null;
};

export const SelectContent = ({ children, className = '', ...props }: { children?: React.ReactNode; className?: string; [key: string]: any }) => {
  return <>{children}</>;
};

export const SelectItem = ({ value, children, ...props }: { value: string; children?: React.ReactNode; [key: string]: any }) => {
  return <option value={value}>{children}</option>;
};
