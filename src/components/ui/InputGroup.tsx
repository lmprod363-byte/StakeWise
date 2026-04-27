import React from 'react';
import { cn } from '../../lib/utils';

interface InputGroupProps {
  label: string;
  type?: string;
  className?: string;
  value?: any;
  onChange?: (e: any) => void;
  required?: boolean;
  placeholder?: string;
  step?: string | number;
  list?: string;
  autoFocus?: boolean;
}

export function InputGroup({ label, className, type = "text", ...props }: InputGroupProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">{label}</label>
      <input 
        type={type}
        className={cn(
          "w-full bg-bg border border-border rounded-lg p-3 text-xs font-bold text-text-main focus:border-accent outline-none focus:ring-1 focus:ring-accent/20 transition-all",
          className
        )}
        {...props} 
      />
    </div>
  );
}
