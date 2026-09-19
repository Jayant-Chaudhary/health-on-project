import { useEffect, useState } from 'react';
import { SectionCard } from '../common/SectionCard.jsx';
import { useAutosave } from '../../hooks/useAutosave.js';

const STATUS_TEXT = {
  idle: '',
  pending: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'Auto-saved',
  error: 'Save failed — retry',
};

/** Free-text clinical observations, auto-saved so nothing is lost mid-consult. */
export function ConsultancyNotes({ notes, onSave }) {
  const [text, setText] = useState(notes?.text ?? '');
  const { status, savedAt, schedule } = useAutosave(onSave);

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
