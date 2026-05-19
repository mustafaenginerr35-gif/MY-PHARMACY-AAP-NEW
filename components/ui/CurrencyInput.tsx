import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { formatNumberWithCommas, parseFormattedNumber, convertArabicToEnglishDigits } from '@/src/lib/formatters';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'defaultValue'> {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  className?: string;
  name?: string;
}

export const CurrencyInput = ({ 
  value, 
  defaultValue, 
  onChange, 
  className, 
  name,
  ...props 
}: CurrencyInputProps) => {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    const initial = value !== undefined ? value : (defaultValue !== undefined ? defaultValue : '');
    return initial !== '' ? formatNumberWithCommas(initial.toString()) : '';
  });

  useEffect(() => {
    if (value !== undefined) {
      const formatted = formatNumberWithCommas(value);
      const currentNumeric = parseFormattedNumber(displayValue);
      // Only sync from prop if the numeric value is actually different
      // This prevents the cursor from jumping when the user is typing (e.g. typing a decimal)
      if (value !== currentNumeric) {
        setDisplayValue(formatted);
      } else if (value === 0 && displayValue === "") {
        // Keep it empty if it's 0 and the user cleared it
      } else if (value.toString() !== currentNumeric.toString()) {
        // Handle edge cases where numeric values are equal but strings differ (e.g. "1.0" vs "1")
        // but only if it's not a temporary typing state
      }
    } else if (defaultValue !== undefined && !displayValue) {
      setDisplayValue(formatNumberWithCommas(defaultValue));
    }
  }, [value, defaultValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Convert Arabic digits to English immediately
    const normalizedValue = convertArabicToEnglishDigits(rawValue);
    
    // Clean string to only keep digits, one decimal point, and one minus sign
    const cleanStr = normalizedValue.replace(/[^0-9.-]/g, '');
    
    // Basic validation to prevent multiple decimal points or minus signs in wrong places
    const parts = cleanStr.split('.');
    let processedValue = parts[0];
    if (parts.length > 1) {
      processedValue += '.' + parts.slice(1).join('');
    }
    
    const formattedValue = formatNumberWithCommas(processedValue);
    setDisplayValue(formattedValue);
    
    if (onChange) {
      const numericValue = parseFormattedNumber(formattedValue);
      onChange(numericValue);
    }
  };

  return (
    <>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        className={className}
        autoComplete="off"
      />
      {/* Hidden input to ensure form submissions get the raw number if needed */}
      <input type="hidden" name={name} value={parseFormattedNumber(displayValue)} />
    </>
  );
};
