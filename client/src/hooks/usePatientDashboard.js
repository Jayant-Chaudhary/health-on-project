import { useCallback, useEffect, useState } from 'react';
import { fetchPatientDashboard } from '../services/clinicianService.js';

/**
 * Loads (and lets callers locally patch) the full dashboard view model for one
 * patient. Optimistic updates write through `patch` so the UI stays responsive
 * while the corresponding API call is in flight.
 */
export function usePatientDashboard(patientId, appointmentId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    // No patient selected (empty queue, or the queue failed to load) — settle
    // rather than leaving the caller on a spinner forever.
    if (!patientId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setData(await fetchPatientDashboard(patientId, appointmentId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [patientId, appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = useCallback((updater) => {
    setData((current) => (current ? { ...current, ...updater(current) } : current));
  }, []);

  return { data, loading, error, reload: load, patch };
}
