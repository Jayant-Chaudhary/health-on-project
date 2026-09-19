import { initialsOf } from '../../utils/format.js';

const SIZES = {
  sm: 'h-8 w-8 text-label-md',
  md: 'h-10 w-10 text-label-lg',
  lg: 'h-14 w-14 text-body-lg',
};

const TONES = {
  neutral: 'border-line bg-subcanvas text-ink-2',
  cypress: 'border-cypress bg-cypress text-[#FFFDFB]',
};

export function Avatar({ name, size = 'md', tone = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border font-display
                  ${SIZES[size]} ${TONES[tone]} ${className}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

export default Avatar;
