const VARIANTS = {
  primary: 'bg-cypress text-surface hover:bg-cypress-deep active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]',
  secondary: 'border border-line bg-subcanvas text-cypress hover:bg-[#F3ECE0]',
  ghost: 'text-ink-2 hover:bg-subcanvas hover:text-ink',
  urgent: 'bg-terracotta text-white hover:bg-terracotta-deep',
};

const SIZES = {
  sm: 'h-8 px-3 text-label-md',
  md: 'h-10 px-4 text-label-lg',
};

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-display transition-colors
                  disabled:cursor-not-allowed disabled:opacity-50
                  ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({ label, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line
                  bg-surface text-ink-2 transition-colors hover:bg-subcanvas hover:text-ink ${className}`}
      {...props}
    />
  );
}

export default Button;
