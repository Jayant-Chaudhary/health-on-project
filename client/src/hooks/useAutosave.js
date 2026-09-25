import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounced autosave for the consultancy notes textarea.
 * Status cycles idle → saving → saved so the panel can show a live indicator
 * instead of making the doctor hunt for a save button.
 */
export function useAutosave(save, { delay = 1200 } = {}) {
  const [status, setStatus] = useState('idle');
  const [savedAt, setSavedAt] = useState(null);
  const timer = useRef(null);
  const saveRef = useRef(save);
  // The value waiting on the debounce, so flush() knows what to save.
  const pending = useRef(null);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const run = useCallback(async (value) => {
    pending.current = null;
    setStatus('saving');
    try {
      await saveRef.current(value);
      setSavedAt(new Date());
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      throw err;
    }
  }, []);

  const schedule = useCallback(
    (value) => {
      setStatus('pending');
      pending.current = { value };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => run(value).catch(() => {}), delay);
    },
    [delay, run]
  );

  /**
   * Save now instead of waiting for the debounce — e.g. before the visit is
   * ended. Resolves when nothing is left unsaved; rejects if the save fails.
   */
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (pending.current) await run(pending.current.value);
  }, [run]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { status, savedAt, schedule, flush };
}
