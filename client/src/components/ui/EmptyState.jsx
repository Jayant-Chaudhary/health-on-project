import React from 'react';
import { cn } from '../../utils/cn';

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center px-4", className)}>
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-subcanvas mb-4 text-ink-3">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-3 max-w-sm mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
