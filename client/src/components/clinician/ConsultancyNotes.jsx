import { useEffect, useState } from 'react';
import { SectionCard } from '../common/SectionCard.jsx';
import { useAutosave } from '../../hooks/useAutosave.js';
import { ChecklistPicker } from './ChecklistPicker.jsx';

const STATUS_TEXT = {
  idle: '',
  pending: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'Auto-saved',
  error: 'Save failed — retry',
};

/**
 * The consultation record: the clinician's standard items ticked off, plus
 * free-text observations for this patient, auto-saved so nothing is lost
 * mid-consult.
 */
export function ConsultancyNotes({
  notes,
  onSave,
  templates = [],
  checkedItems = [],
  onCheckItem,
  onUncheckItem,
  flushRef,
}) {
  const [text, setText] = useState(notes?.text ?? '');
  const { status, savedAt, schedule, flush } = useAutosave(onSave);

  // Lets the dashboard save unsaved notes before it ends the visit.
  useEffect(() => {
    if (flushRef) flushRef.current = flush;
  }, [flushRef, flush]);

  // Re-seed when the clinician switches patients.
  useEffect(() => {
    setText(notes?.text ?? '');
  }, [notes?.text]);

  function onChange(event) {
    setText(event.target.value);
    schedule(event.target.value);
  }

  const savedLabel =
    status === 'saved' && savedAt
      ? `Auto-saved ${savedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`
      : STATUS_TEXT[status];

  return (
    <SectionCard
      icon="notes"
      title="Consultancy Notes"
      subtitle="Active consultation"
      action={
        savedLabel && (
          <span
            className={`flex shrink-0 items-center gap-1.5 text-body-sm ${
              status === 'error' ? 'text-terracotta' : 'text-ink-3'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'error' ? 'bg-terracotta' : status === 'saved' ? 'bg-sage' : 'bg-olive'
              }`}
            />
            {savedLabel}
          </span>
        )
      }
      bodyClassName="p-4"
    >
      <div className="mb-4">
        <h3 className="mb-2 text-label-sm uppercase text-ink-3">Consultation checklist</h3>
        <ChecklistPicker
          templates={templates}
          selected={checkedItems}
          onAdd={onCheckItem}
          onRemove={onUncheckItem}
          placeholder="Add an item for this consultation…"
          emptyHint="Save your standard consultation items under Checklists to tick them here."
        />
      </div>

      <h3 className="mb-2 text-label-sm uppercase text-ink-3">Notes</h3>
      <label className="sr-only" htmlFor="consultancy-notes">
        Consultancy notes
      </label>
      <textarea
        id="consultancy-notes"
        value={text}
        onChange={onChange}
        rows={10}
        placeholder="Subjective, objective, assessment, plan…"
        className="field min-h-[200px] w-full resize-y py-3 leading-relaxed"
      />
    </SectionCard>
  );
}

export default ConsultancyNotes;
