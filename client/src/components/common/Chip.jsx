import { statusOf } from '../../utils/clinical.js';

/**
 * Pill-shaped clinical status tag. `status` keys into the shared clinical
 * vocabulary so a metric reads the same colour wherever it appears.
 */
export function Chip({ status, children, withDot = false, className = '' }) {
  const tone = statusOf(status);

  return (
    <span className={`pill ${tone.chip} ${className}`}>
      {withDot && <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />}
      {children ?? tone.label}
    </span>
  );
}

/** Neutral, non-clinical tag (MRN, blood type, counts). */
export function MetaChip({ children, className = '' }) {
  return (
    <span className={`pill border-line bg-subcanvas text-ink-2 normal-case ${className}`}>{children}</span>
  );
}

export default Chip;
