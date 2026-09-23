import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Spinner({ className, size = 24, ...props }) {
  return (
    <Loader2 
      className={cn("animate-spin text-primary", className)} 
      size={size} 
      {...props} 
    />
  );
}
