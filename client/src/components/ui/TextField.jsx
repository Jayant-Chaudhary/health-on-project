import React from 'react';
import { cn } from '../../utils/cn';

export const TextField = React.forwardRef(({ className, label, type = 'text', id, ...props }, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/gi, '-') : undefined);
  return (
    <div className="w-full text-left">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium mb-1.5 text-slate-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={cn(
          "flex min-h-[48px] w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    </div>
  );
});
TextField.displayName = "TextField";
