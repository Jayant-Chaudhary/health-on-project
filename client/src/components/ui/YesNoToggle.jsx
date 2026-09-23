import React from 'react';
import { cn } from '../../utils/cn';

export const YesNoToggle = React.forwardRef(({ value, onChange, className, ...props }, ref) => {
  return (
    <div className={cn("flex rounded-control border border-gray-300 overflow-hidden", className)} ref={ref} {...props}>
      <button
        type="button"
        className={cn(
          "flex-1 min-h-[56px] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary z-10",
          value === true ? "bg-coral text-white font-medium" : "bg-white text-gray-700 hover:bg-gray-50"
        )}
        onClick={() => onChange(true)}
      >
        Yes
      </button>
      <button
        type="button"
        className={cn(
          "flex-1 min-h-[56px] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary z-10 border-l border-gray-300",
          value === false ? "bg-gray-200 text-gray-900 font-medium" : "bg-white text-gray-700 hover:bg-gray-50"
        )}
        onClick={() => onChange(false)}
      >
        No
      </button>
    </div>
  );
});
YesNoToggle.displayName = "YesNoToggle";
