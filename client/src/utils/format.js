const DATE_FMT = { month: 'short', day: 'numeric', year: 'numeric' };
const SHORT_FMT = { month: 'short', day: 'numeric' };

export function formatDate(value, opts = DATE_FMT) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', opts);
}

export function formatShortDate(value) {
  return formatDate(value, SHORT_FMT);
}

/** "Thursday, Oct 24, 2025 · 14:32" for the top bar. */
export function formatHeaderDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const day = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}`;
}

/** Days-since helper used for "logged 2d ago" style metadata. */
export function relativeDays(value) {
  if (!value) return '';
  const diff = Math.round((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

/** Gestational age stored as total days → "28w 4d". */
export function formatGestationalAge(totalDays) {
  if (totalDays == null) return '—';
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return `${weeks}w ${days}d`;
}

export function trimesterOf(totalDays) {
  if (totalDays == null) return '';
  if (totalDays < 98) return '1st Tri';
  if (totalDays < 189) return '2nd Tri';
  return '3rd Tri';
}

export function initialsOf(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
