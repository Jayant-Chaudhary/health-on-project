import React from 'react';
import { cn } from '../../utils/cn';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-line", className)}
      {...props}
    />
  );
}
