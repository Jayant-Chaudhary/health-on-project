import React from 'react';
import { cn } from '../../utils/cn';

export const Button = React.forwardRef(({ className, variant = 'primary', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:pointer-events-none disabled:opacity-50 min-h-[48px] px-4",
        {
          'bg-green-800 text-slate-100 hover:bg-green-900 font-semibold shadow-sm w-full': variant === 'primary',
          'border border-slate-300 text-slate-700 hover:bg-slate-100 bg-transparent': variant === 'secondary',
        },
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";
