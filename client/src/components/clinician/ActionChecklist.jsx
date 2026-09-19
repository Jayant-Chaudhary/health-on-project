import { useState } from 'react';
import { SectionCard } from '../common/SectionCard.jsx';
import { Icon } from '../common/Icon.jsx';

/**
 * Quick-action checklist. Each toggle becomes a post-visit action item on the
 * patient's side, so the doctor builds the patient's "next steps" by ticking
 * boxes rather than typing them out.
 */
export function ActionChecklist({ items = [], onToggle, onAdd }) {
  const [draft, setDraft] = useState('');
  const completed = items.filter((item) => item.isCompleted).length;

  async function submit(event) {
    event.preventDefault();
    const label = draft.trim();
    if (!label) return;
    setDraft('');
    await onAdd?.(label);
  }

  return (
    <SectionCard
      icon="check"
      title="Action Checklist"
      subtitle="Becomes the patient's post-visit next steps"
      action={
        <span className="shrink-0 rounded-full bg-sage-surface px-3 py-1 text-label-sm uppercase tabular text-sage-ink">
          {completed} of {items.length}
        </span>
      }
      bodyClassName="p-4"
    >
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors
                          ${
                            item.isCompleted
                              ? 'border-sage-border bg-sage-surface'
                              : 'border-line bg-subcanvas hover:border-line-strong'
                          }`}
            >
              <input
                type="checkbox"
                checked={item.isCompleted}
                onChange={(event) => onToggle?.(item, event.target.checked)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px]
                            ${item.isCompleted ? 'border-cypress bg-cypress text-surface' : 'border-line-strong bg-raised'}`}
              >
                {item.isCompleted && <Icon name="check" size={12} strokeWidth={2.5} />}
              </span>
              <span className={`text-body-md ${item.isCompleted ? 'text-sage-ink' : 'text-ink'}`}>
                {item.label}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <label className="sr-only" htmlFor="new-action-item">
          Add an action item
        </label>
        <input
          id="new-action-item"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add an action item…"
          className="field h-9 flex-1"
        />
        <button
          type="submit"
          aria-label="Add action item"
          disabled={!draft.trim()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cypress text-surface
                     transition-colors hover:bg-cypress-deep disabled:opacity-40"
        >
          <Icon name="plus" size={16} />
        </button>
      </form>
    </SectionCard>
  );
}

export default ActionChecklist;
