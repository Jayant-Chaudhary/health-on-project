import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Checkbox = React.forwardRef(({ className, checked, onChange, label, ...props }, ref) => {
  return (
    <label className="flex items-center min-h-[48px] cursor-pointer group">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
          ref={ref}
          {...props}
        />
        <div className={cn(
          "h-5 w-5 rounded border border-line-strong bg-raised transition-colors group-hover:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary",
          checked && "bg-primary border-primary",
          className
        )}>
          {checked && <Check className="h-3.5 w-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
        </div>
      </div>
      {label && <span className="ml-3 text-sm text-ink-2 select-none">{label}</span>}
    </label>
  );
});
Checkbox.displayName = "Checkbox";
