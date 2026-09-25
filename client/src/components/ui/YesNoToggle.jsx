import React from 'react';
import { cn } from '../../utils/cn';

const OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

/**
 * Two-button Yes/No choice. `value` is 'yes', 'no' or undefined (unanswered),
 * the same strings the check-in form stores and checkinService.saveAnswers
 * sends — so a saved answer shows as selected when the patient comes back.
 */
export const YesNoToggle = React.forwardRef(({ value, onChange, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="radiogroup"
      className={cn('flex overflow-hidden rounded-control border border-line-strong bg-raised', className)}
      {...props}
    >
      {OPTIONS.map((option, index) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex min-h-[56px] flex-1 items-center justify-center gap-2 text-body-lg transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
              index > 0 && 'border-l border-line-strong',
              selected
                ? option.value === 'yes'
                  ? 'bg-primary font-semibold text-white'
                  : 'bg-ink-2 font-semibold text-canvas'
                : 'text-ink hover:bg-subcanvas'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
});
YesNoToggle.displayName = 'YesNoToggle';
