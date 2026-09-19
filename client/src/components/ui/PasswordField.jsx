import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';
import { TextField } from './TextField';

export const PasswordField = React.forwardRef(({ className, ...props }, ref) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextField
        type={show ? 'text' : 'password'}
        className={cn("pr-12", className)}
        ref={ref}
        {...props}
      />
      <button
        type="button"
        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[48px] min-w-[48px] flex items-center justify-center rounded-r-md"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
PasswordField.displayName = "PasswordField";
