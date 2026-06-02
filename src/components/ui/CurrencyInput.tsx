import React, { useEffect, useState } from 'react';
import { Input } from './input';

interface CurrencyInputProps {
  id?: string;
  name?: string;
  value?: string | number;
  onValueChange?: (val: string) => void;
  onChange?: (val: number) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  readOnly?: boolean;
}

export const CurrencyInput = ({
  id,
  name,
  value,
  onValueChange,
  onChange,
  placeholder = '0',
  className = '',
  required = false,
  readOnly = false
}: CurrencyInputProps) => {
  const formatNumber = (numStr: string) => {
    const clean = numStr.replace(/\D/g, '');
    if (!clean) return '';
    return Number(clean).toLocaleString('en-US');
  };

  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value !== undefined) {
      setDisplayValue(formatNumber(String(value)));
    }
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanNum = e.target.value.replace(/\D/g, '');
    setDisplayValue(formatNumber(cleanNum));
    
    if (onValueChange) {
      onValueChange(cleanNum);
    }
    if (onChange) {
      onChange(Number(cleanNum) || 0);
    }
  };

  return (
    <Input
      id={id}
      name={name}
      value={displayValue}
      onChange={handleTextChange}
      placeholder={placeholder}
      className={className}
      required={required}
      readOnly={readOnly}
      type="text"
      dir="ltr"
    />
  );
};
