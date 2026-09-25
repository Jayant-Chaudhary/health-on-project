import React from 'react';
import { cn } from '../../utils/cn';

export function Stepper({ steps, currentStep, className }) {
  return (
    <div className={cn("flex items-center w-full", className)}>
      {steps.map((step, index) => {
        const isActive = index <= currentStep;
        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors",
                isActive ? "border-primary bg-primary text-white" : "border-line-strong text-ink-3"
              )}>
                {index + 1}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2 transition-colors",
                index < currentStep ? "bg-primary" : "bg-line"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
