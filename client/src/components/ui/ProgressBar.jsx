import React from 'react';
import { cn } from '../../utils/cn';

export function ProgressBar({ progress, className }) {
  return (
    <div className={cn("w-full bg-gray-200 rounded-full h-2.5 overflow-hidden", className)}>
      <div
        className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      />
    </div>
  );
}
