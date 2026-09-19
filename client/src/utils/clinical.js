/**
 * Clinical status vocabulary shared by chips, table rows and the trend chart.
 * Keep this the single source of truth — a metric's status decides its colour
 * everywhere it appears.
 */
export const STATUS = {
  optimal: {
    label: 'Optimal',
    chip: 'border-sage-border bg-sage-surface text-sage-ink',
    dot: 'bg-sage',
    stroke: '#607A68',
  },
  watch: {
    label: 'Watch',
    chip: 'border-rose-border bg-rose-surface text-rose',
    dot: 'bg-rose',
    stroke: '#C48A96',
  },
  elevated: {
    label: 'Elevated',
    chip: 'border-terracotta-border bg-terracotta-surface text-terracotta',
    dot: 'bg-terracotta',
    stroke: '#B4654A',
  },
  pending: {
    label: 'Pending',
    chip: 'border-olive-border bg-olive-surface text-olive',
    dot: 'bg-olive',
    stroke: '#857A68',
  },
};

export function statusOf(key) {
  return STATUS[key] ?? STATUS.pending;
}

/** A "Yes" on a red-flag question is what the clinician must see first. */
export function isRedFlag(answer) {
  return answer?.isRedFlagTrigger === true && answer?.answer === true;
}

export function countRedFlags(answers = []) {
  return answers.filter(isRedFlag).length;
}

/** Direction of the latest move, used for the ▲/▼ trend indicator. */
export function trendOf(history = []) {
  if (history.length < 2) return { direction: 'flat', delta: 0 };
  const [previous, latest] = history.slice(-2);
  const delta = Number((latest.value - previous.value).toFixed(2));
  if (delta === 0) return { direction: 'flat', delta: 0 };
  return { direction: delta > 0 ? 'up' : 'down', delta };
}
