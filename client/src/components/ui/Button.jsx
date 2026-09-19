import React from 'react';
import { cn } from '../../utils/cn';

export const Button = React.forwardRef(({ className, variant = 'primary', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 min-h-[48px]",
        {
          'bg-coral text-white hover:bg-coral/90 w-full': variant === 'primary',
          'border border-teal text-teal hover:bg-teal/10 bg-transparent': variant === 'secondary',
        },
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";
