import React from 'react';
import { cn } from '../../utils/cn';

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-card border bg-raised text-ink shadow-card p-4 sm:p-5", className)} {...props} />
));
Card.displayName = "Card";
