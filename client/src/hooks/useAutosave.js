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

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const schedule = useCallback(
    (value) => {
      setStatus('pending');
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        setStatus('saving');
        try {
          await saveRef.current(value);
          setSavedAt(new Date());
          setStatus('saved');
        } catch {
          setStatus('error');
        }
      }, delay);
    },
    [delay]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { status, savedAt, schedule };
}
